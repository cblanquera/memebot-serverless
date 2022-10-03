import { Box, SearchResult, Direction } from '../utils/types';
import { Source as SourceType } from '../utils/prisma';
export default class Source {
    static addCID(source: SourceType, cid?: string | null): Promise<SourceType>;
    static cache(url: string, results: SearchResult[]): Promise<void>;
    static detect(url: string, faces: Box[][], cid?: string | null): Promise<SourceType>;
    static get(id: number | string): Promise<SourceType | null>;
    static getOrThrow(id: number | string): Promise<SourceType>;
    static makeFromCID(url: string, cid: string): Promise<SourceType>;
    static findOneWithData(query: string, skip?: number): Promise<SourceType | null>;
    static findAllWithSource(source: string): Promise<SourceType[]>;
    static findAllWithNoData(skip?: number, take?: number): Promise<SourceType[]>;
    static vote(source: number | string | SourceType, direction: Direction): Promise<SourceType>;
}
