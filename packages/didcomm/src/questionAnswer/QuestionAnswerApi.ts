import type { Query } from '@credo-ts/core'
import type { QuestionAnswerRecord, ValidResponse } from '@credo-ts/question-answer'
import { DidCommAgent } from '../DidCommSdk'

export type SendQuestionConfig = {
  question: string
  validResponses: ValidResponse[]
  detail?: string
}

export class QuestionAnswerApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  /**
   * Sends a question to the connection with the given connection id.
   *
   * @param connectionId The connection id.
   * @param config The question to send.
   */
  public async sendQuestion(connectionId: string, config: SendQuestionConfig) {
    return this.agent.modules.questionAnswer.sendQuestion(connectionId, config)
  }

  /**
   * Sends an answer to the question with the given question record id.
   *
   * @param questionRecordId The question record id.
   * @param response The response to send.
   */
  public async sendAnswer(questionRecordId: string, response: string) {
    return this.agent.modules.questionAnswer.sendAnswer(questionRecordId, response)
  }

  /**
   * Retrieves all question answer records that match the given query.
   *
   * @param query The query to use to find the question record.
   */
  public async getAllQuestionAnswerRecords(query: Query<QuestionAnswerRecord>) {
    return this.agent.modules.questionAnswer.findAllByQuery(query)
  }

  /**
   * Retrieves the question answer record with the given id.
   *
   * @param questionAnswerRecordId The question record id.
   */
  public async getQuestionAnswerRecordById(questionRecordId: string) {
    return this.agent.modules.questionAnswer.findById(questionRecordId)
  }

}