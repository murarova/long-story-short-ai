import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { BaseRetriever } from '@langchain/core/retrievers';

export async function buildRagChain(
  chatModel: ChatGoogleGenerativeAI,
  retriever: BaseRetriever
): Promise<(input: { input: string }) => Promise<{ answer: string }>> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a helpful assistant answering questions about an audio transcript. ' +
      'Use the provided context to craft concise, factual answers. ' +
      'If the context is insufficient, say you do not know. ' +
      'Always cite the source using the simplified source information (e.g., \'Source: Audio Transcript\').',
    ],
    ['human', 'Question: {input}\n\nContext:\n{context}'],
  ]);

  const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt,
  });

  const retrievalChain = await createRetrievalChain({
    retriever,
    combineDocsChain: documentChain,
  });

  return async (input: { input: string }) => {
    const result = await retrievalChain.invoke(input);
    return { answer: result.answer };
  };
}

export async function answerQuestion(
  question: string,
  ragChain: (input: { input: string }) => Promise<{ answer: string }>
): Promise<{ answer: string }> {
  return await ragChain({ input: question });
}
