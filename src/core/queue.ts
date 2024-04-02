import Block from "../block"

class SyncQueue {
  queue: Array<Block>
  isSyncing: boolean

  constructor() {
    this.queue = []
    this.isSyncing = false
  }

  async add(
    block: Block,
    verificationHandler: (data: Block) => Promise<boolean>
  ) {
    this.queue.push(block)

    if (!this.isSyncing) {
      this.isSyncing = true
      await this.sync(verificationHandler)
    }
  }

  async sync(verificationHandler: (data: Block) => Promise<boolean>) {
    while (this.queue.length !== 0) {
      const block = this.queue.shift()

      if (block && (await verificationHandler(block))) break
    }

    this.isSyncing = false
  }

  wipe() {
    this.queue = []
    this.isSyncing = false
  }
}

export default SyncQueue
