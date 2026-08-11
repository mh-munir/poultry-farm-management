import { config } from 'dotenv';
config();
import { getPartyAccountSummary } from '../src/features/parties/actions.ts';

(async () => {
  try {
    const result = await getPartyAccountSummary(58);
    console.log('result', result);
  } catch (error) {
    console.error('error', error);
    process.exit(1);
  }
})();
