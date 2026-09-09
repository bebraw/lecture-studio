import {DurableObject} from "cloudflare:workers";

// One object per lecture broadcast; voting remains in separate room objects.
export class StageState extends DurableObject<Env> {
 async publish(stage:Record<string,unknown>) { await this.ctx.storage.put("stage",stage); }
 async read() { return await this.ctx.storage.get<Record<string,unknown>>("stage") || null; }
}
