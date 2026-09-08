/// <reference path="./manga-provider.d.ts" />

/**
 * MangaDex Manga Provider Extension for Seanime
 * Implements Search, Chapter Listing with multi-language & multi-scanlator support,
 * and Chapter Page resolution via MangaDex@Home CDN.
 */

interface MangaDexTitle {
    [locale: string]: string
}

interface MangaDexAltTitle {
    [locale: string]: string
}

interface MangaDexRelationship {
    id: string
    type: string
    related?: string
    attributes?: {
        name?: string
        fileName?: string
        [key: string]: any
    }
}

interface MangaDexMangaAttributes {
    title: MangaDexTitle
    altTitles: MangaDexAltTitle[]
    description: { [locale: string]: string }
    year?: number
    status?: string
    contentRating?: string
    [key: string]: any
}

interface MangaDexManga {
    id: string
    type: string
    attributes: MangaDexMangaAttributes
    relationships: MangaDexRelationship[]
}

interface MangaDexSearchResponse {
    result: string
    response: string
    data: MangaDexManga[]
    limit: number
    offset: number
    total: number
}

interface MangaDexChapterAttributes {
    volume?: string | null
    chapter?: string | null
    title?: string | null
    translatedLanguage: string
    externalUrl?: string | null
    publishAt: string
    readableAt: string
    createdAt: string
    updatedAt: string
    pages: number
    version: number
}

interface MangaDexChapter {
    id: string
    type: string
    attributes: MangaDexChapterAttributes
    relationships: MangaDexRelationship[]
}

interface MangaDexChapterFeedResponse {
    result: string
    response: string
    data: MangaDexChapter[]
    limit: number
    offset: number
    total: number
}

interface MangaDexAtHomeResponse {
    result: string
    baseUrl: string
    chapter: {
        hash: string
        data: string[]
        dataSaver: string[]
    }
}

class Provider {
    private api = "https://api.mangadex.org"

    /**
     * Provider settings.
     * MangaDex natively supports multiple languages and scanlator groups.
     */
    getSettings(): Settings {
        return {
            supportsMultiLanguage: true,
            supportsMultiScanlator: true,
        }
    }

    /**
     * Searches MangaDex for manga matching the given query.
     * Extracts title (en / ja-ro fallback), alternate titles for synonyms,
     * year, and cover art thumbnail.
     */
    async search(opts: QueryOptions): Promise<SearchResult[]> {
        if (!opts.query || opts.query.trim().length === 0) {
            return []
        }

        const query = encodeURIComponent(opts.query.trim())
        const url = `${this.api}/manga?title=${query}&limit=25&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[relevance]=desc`

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            })

            if (!res.ok) {
                console.error("MangaDex search failed with status:", res.status)
                return []
            }

            const json = (await res.json()) as MangaDexSearchResponse
            if (!json || !json.data || !Array.isArray(json.data)) {
                return []
            }

            const results: SearchResult[] = []

            for (const manga of json.data) {
                if (!manga || !manga.attributes) continue

                // Title resolution: en -> ja-ro -> first available key
                let title = ""
                if (manga.attributes.title) {
                    title =
                        manga.attributes.title["en"] ||
                        manga.attributes.title["ja-ro"] ||
                        Object.values(manga.attributes.title)[0] ||
                        ""
                }

                // Synonyms from altTitles
                const synonyms: string[] = []
                if (manga.attributes.altTitles && Array.isArray(manga.attributes.altTitles)) {
                    for (const alt of manga.attributes.altTitles) {
                        if (typeof alt === "object" && alt !== null) {
                            for (const altVal of Object.values(alt)) {
                                if (altVal && typeof altVal === "string" && altVal.trim().length > 0) {
                                    synonyms.push(altVal.trim())
                                }
                            }
                        }
                    }
                }

                // Cover art image URL
                let image: string | undefined
                if (manga.relationships && Array.isArray(manga.relationships)) {
                    const coverRel = manga.relationships.find((r) => r.type === "cover_art")
                    if (coverRel?.attributes?.fileName) {
                        image = `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg`
                    }
                }

                results.push({
                    id: manga.id,
                    title: title || "Unknown Title",
                    synonyms,
                    year: manga.attributes.year ?? undefined,
                    image,
                })
            }

            return results
        } catch (err) {
            console.error("MangaDex search error:", err)
            return []
        }
    }

    /**
     * Fetches all available chapters for a given manga.
     * Handles pagination up to 10,000 chapters, filters out external/empty chapters,
     * extracts scanlator names, and orders chapters ascending by chapter number.
     */
    async findChapters(mangaId: string): Promise<ChapterDetails[]> {
        if (!mangaId) {
            return []
        }

        const chapters: ChapterDetails[] = []
        const limit = 500
        let offset = 0
        let total = 1
        const maxIterations = 20
        let iterations = 0

        try {
            while (offset < total && iterations < maxIterations) {
                iterations++
                const url = `${this.api}/manga/${encodeURIComponent(mangaId)}/feed?limit=${limit}&offset=${offset}&includes[]=scanlation_group&order[chapter]=asc&order[volume]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includeExternalUrl=0`

                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                    },
                })

                if (!res.ok) {
                    console.error("MangaDex chapter feed request failed with status:", res.status)
                    break
                }

                const json = (await res.json()) as MangaDexChapterFeedResponse
                if (!json || !json.data || !Array.isArray(json.data) || json.data.length === 0) {
                    break
                }

                total = json.total || 0

                for (const ch of json.data) {
                    if (!ch || !ch.attributes) continue

                    // Filter out external URLs and chapters with 0 pages
                    if (ch.attributes.externalUrl || ch.attributes.pages === 0) {
                        continue
                    }

                    // Extract scanlator group name from relationships
                    let scanlator: string | undefined
                    if (ch.relationships && Array.isArray(ch.relationships)) {
                        const groupRel = ch.relationships.find((r) => r.type === "scanlation_group")
                        if (groupRel?.attributes?.name) {
                            scanlator = groupRel.attributes.name
                        }
                    }

                    const chapNum = ch.attributes.chapter != null ? String(ch.attributes.chapter) : ""

                    // Format title
                    let title = ""
                    if (chapNum.length > 0) {
                        title = `Chapter ${this.padNum(chapNum, 2)}`
                        if (ch.attributes.title && ch.attributes.title.trim().length > 0) {
                            title += `: ${ch.attributes.title.trim()}`
                        }
                    } else if (ch.attributes.title && ch.attributes.title.trim().length > 0) {
                        title = ch.attributes.title.trim()
                    } else {
                        title = "Oneshot"
                    }

                    chapters.push({
                        id: ch.id,
                        url: `https://mangadex.org/chapter/${ch.id}`,
                        title,
                        chapter: chapNum || "0",
                        index: 0,
                        scanlator,
                        language: ch.attributes.translatedLanguage || undefined,
                        updatedAt: ch.attributes.updatedAt || undefined,
                    })
                }

                offset += limit
            }

            // Sort chapters ascending by numeric chapter value
            chapters.sort((a, b) => {
                const numA = parseFloat(a.chapter) || 0
                const numB = parseFloat(b.chapter) || 0
                return numA - numB
            })

            // Assign sequential 0-based indices required by Seanime
            for (let i = 0; i < chapters.length; i++) {
                chapters[i].index = i
            }

            return chapters
        } catch (err) {
            console.error("MangaDex findChapters error:", err)
            return chapters
        }
    }

    /**
     * Resolves CDN page image URLs for a chapter using the MangaDex@Home API.
     */
    async findChapterPages(chapterId: string): Promise<ChapterPage[]> {
        if (!chapterId) {
            return []
        }

        try {
            const url = `${this.api}/at-home/server/${encodeURIComponent(chapterId)}?forcePort443=true`
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            })

            if (!res.ok) {
                console.error("MangaDex at-home request failed with status:", res.status)
                return []
            }

            const json = (await res.json()) as MangaDexAtHomeResponse
            if (!json || json.result !== "ok" || !json.baseUrl || !json.chapter || !Array.isArray(json.chapter.data)) {
                return []
            }

            const pages: ChapterPage[] = []
            const { baseUrl, chapter } = json

            for (let i = 0; i < chapter.data.length; i++) {
                const filename = chapter.data[i]
                pages.push({
                    url: `${baseUrl}/data/${chapter.hash}/${filename}`,
                    index: i,
                    headers: {
                        "Referer": "https://mangadex.org/",
                    },
                })
            }

            return pages
        } catch (err) {
            console.error("MangaDex findChapterPages error:", err)
            return []
        }
    }

    /**
     * Zero-pads chapter numbers for uniform ordering and display (e.g., '1' -> '01', '1.5' -> '01.5')
     */
    padNum(number: string, places: number): string {
        let range = number.split("-")
        range = range.map((chapter) => {
            chapter = chapter.trim()
            const digits = chapter.split(".")[0].length
            return "0".repeat(Math.max(0, places - digits)) + chapter
        })
        return range.join("-")
    }
}
