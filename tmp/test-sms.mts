import 'dotenv/config';
import { BulkSmsBdProvider } from '../src/lib/sms/providers/bulksmsbd.provider.ts';

const result = await BulkSmsBdProvider.sendSms('01811914794', 'Test SMS from poultry farm management system');
console.log(JSON.stringify(result));
