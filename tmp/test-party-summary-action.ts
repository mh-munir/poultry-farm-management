import { config } from 'dotenv';
config();
import { getPartyAccountSummary } from '../src/features/parties/actions.ts';

(async () => {
  try {
    const result = await getPartyAccountSummary(58);
    console.log('result', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
})();
