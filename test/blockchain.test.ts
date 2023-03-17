import Block from "../src/block"
import BlockChain from "../src/blockchain"

describe("Blockchain", () => {
  let blockchain: BlockChain
  let newChain: BlockChain
  let originalChain: Array<Block>
  beforeEach(() => {
    blockchain = new BlockChain()
    newChain = new BlockChain()
    originalChain = blockchain.chain
  })

  it("contains chain array instance", () => {
    expect(blockchain.chain instanceof Array).toBe(true)
  })

  it("start with genesis block", () => {
    expect(blockchain.chain[0]).toEqual(Block.genesis())
  })

  it("add new block to chain", () => {
    const newData = "new-data"
    blockchain.addBlock({ data: newData })

    expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData)
  })

  describe("isValidChain()", () => {
    beforeEach(() => {
      blockchain.addBlock({ data: "aku" })
      blockchain.addBlock({ data: "dan" })
      blockchain.addBlock({ data: "kamu" })
    })

    describe("when chain does not start with genesis block", () => {
      it("return false", () => {
        blockchain.chain[0].data = "fake-genesis"

        expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
      })
    })

    describe("when chain start with genesis block and has multiple blocks", () => {
      describe("and chain contain invalid block", () => {
        it("data is changed", () => {
          blockchain.chain[2].data = "tampered"

          expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
        })

        it("last hash is changed", () => {
          blockchain.chain[2].lastHash = "tampered"

          expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
        })
      })

      describe("and chain does not contain invalid block", () => {
        it("return true", () => {
          expect(BlockChain.isValidChain(blockchain.chain)).toBe(true)
        })
      })
    })
  })

  describe("replaceChain()", () => {
    describe("when new chain is not longer", () => {
      it("does not replace the chain", () => {
        blockchain.addBlock({ data: "eat" })
        newChain.addBlock({ data: "sleep" })

        blockchain.replaceChain(newChain.chain)
        expect(blockchain.chain).toEqual(originalChain)
      })
    })

    describe("when new chain is longer", () => {
      beforeEach(() => {
        newChain.addBlock({ data: "aku" })
        newChain.addBlock({ data: "dan" })
        newChain.addBlock({ data: "kamu" })
      })
      describe("and the chain is invalid", () => {
        it("does not replace the chain", () => {
          newChain.chain[2].data = "tampered"

          blockchain.replaceChain(newChain.chain)
          expect(blockchain.chain).toEqual(originalChain)
        })
      })

      describe("and the chain is valid", () => {
        it("replaces the chain", () => {
          blockchain.replaceChain(newChain.chain)
          expect(blockchain.chain).toEqual(newChain.chain)
        })
      })
    })
  })
})
