import Block from "../src/block"
import BlockChain from "../src/blockchain"
import { cryptoHashV2 } from "../src/crypto-hash"
import Transaction from "../src/transaction"

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
    const newData = ["new-data"]
    blockchain.addBlock({ data: newData })

    expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData)
  })

  describe("isValidChain()", () => {
    beforeEach(() => {
      blockchain.addBlock({ data: ["one"] })
      blockchain.addBlock({ data: ["two"] })
      blockchain.addBlock({ data: ["three"] })
    })

    describe("when chain does not start with genesis block", () => {
      it("return false", () => {
        blockchain.chain[0].data = [
          new Transaction({
            from: "",
            to: "",
            data: ["fake-genesis"],
          }),
        ]

        expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
      })
    })

    describe("when chain start with genesis block and has multiple blocks", () => {
      describe("and chain contain invalid block", () => {
        it("data is changed", () => {
          blockchain.chain[2].data = [
            new Transaction({
              from: "",
              to: "",
              data: ["tampered"],
            }),
          ]

          expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
        })

        it("last hash is changed", () => {
          blockchain.chain[2].lastHash = "tampered"

          expect(BlockChain.isValidChain(blockchain.chain)).toBe(false)
        })
      })

      describe("and the chain contains a block with a jumped difficulty", () => {
        it("return false", () => {
          const lastBlock = blockchain.getLastBlock()
          const lastHash = lastBlock.hash
          const timestamp = Date.now()
          const nonce = 0
          const data = [] as const
          const difficulty = lastBlock.difficulty - 3

          const hash = cryptoHashV2(
            timestamp,
            lastHash,
            difficulty,
            nonce,
            data
          )

          const badBlock = new Block({
            data,
            difficulty,
            hash,
            lastHash,
            nonce,
            timestamp,
            number: 1,
          })

          blockchain.chain.push(badBlock)

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
    let errorMock: jest.Mock

    beforeEach(() => {
      errorMock = jest.fn()

      global.console.error = errorMock
    })

    describe("when new chain is not longer", () => {
      beforeEach(() => {
        blockchain.addBlock({ data: ["eat"] })
        newChain.addBlock({ data: ["sleep"] })

        blockchain.replaceChain(newChain.chain)
      })

      it("does not replace the chain", () => {
        expect(blockchain.chain).toEqual(originalChain)
      })

      it("logs an error", () => {
        expect(errorMock).toHaveBeenCalled()
      })
    })

    describe("when new chain is longer", () => {
      beforeEach(() => {
        newChain.addBlock({ data: ["one"] })
        newChain.addBlock({ data: ["two"] })
        newChain.addBlock({ data: ["three"] })
      })

      describe("and the chain is invalid", () => {
        it("does not replace the chain", () => {
          newChain.chain[2].data = [
            new Transaction({
              from: "",
              to: "",
              data: ["tampered"],
            }),
          ]

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
