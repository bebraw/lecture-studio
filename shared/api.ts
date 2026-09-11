import type {createStudio} from "../server.ts";
import type {Note,NoteFile,Stage,FeedbackSnapshot} from "./models.ts";
import type {LectureSearch} from "../lib/lecture-search.ts";
export type DeskState=ReturnType<ReturnType<typeof createStudio>["snapshot"]>;
export type SearchResult=Awaited<ReturnType<LectureSearch["search"]>>;
export type ApiResponse<P extends string> =
 P extends "library" ? {files:NoteFile[]} :
 P extends `note?${string}` ? Note :
 P extends `search?${string}` ? SearchResult :
 P extends "stage" ? Stage :
 P extends "stage-link" ? {url:string} :
 P extends "poll/receipt" ? {text:string} :
 P extends "feedback" ? FeedbackSnapshot|DeskState : DeskState;
export type ApiClient=<P extends string>(path:P,value?:unknown)=>Promise<ApiResponse<P>>;
export interface MountOptions {call:ApiClient;update:(state:DeskState)=>void}
