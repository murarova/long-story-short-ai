import * as readline from 'readline';
import { answerQuestion } from './ragChain.js';

export function parseArguments(): {
  forceRebuild: boolean;
  audioPath: string;
  transcriptCachePath: string | null;
  forceAudioRecompute: boolean;
  queryExpansionsPath: string | null;
} {
  const args = process.argv.slice(2);
  const forceRebuild = args.includes('--force-rebuild');
  const forceAudioRecompute = args.includes('--force-audio-recompute');

  const valueAfter = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    if (idx === -1) return null;
    const v = args[idx + 1];
    if (!v || v.startsWith('--')) return null;
    return v;
  };

  const audioPath = valueAfter('--audio');
  if (!audioPath) throw new Error('Missing required argument: --audio <path>');

  const transcriptCachePath = valueAfter('--transcript-cache');
  const queryExpansionsPath = valueAfter('--query-expansions');

  return {
    forceRebuild,
    audioPath,
    transcriptCachePath,
    forceAudioRecompute,
    queryExpansionsPath,
  };
}

export async function runInteractiveMode(
  ragChain: (input: { input: string }) => Promise<{ answer: string }>
): Promise<void> {
  console.log('Enter questions about the audio transcript.');
  console.log("Type 'exit' or 'quit' to stop.\n");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const askQuestion = () => {
    rl.question('Question: ', async (question) => {
      const trimmed = question.trim();
      if (!trimmed || ['exit', 'quit', 'q'].includes(trimmed.toLowerCase())) {
        console.log('Goodbye!');
        rl.close();
        return;
      }
      
      try {
        const response = await answerQuestion(trimmed, ragChain);
        console.log('\nAnswer:', response.answer);
        console.log();
        askQuestion();
      } catch (error: any) {
        console.log(`\nError: ${error.message}\n`);
        askQuestion();
      }
    });
  };
  
  askQuestion();
}
