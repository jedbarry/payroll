import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { dumpToSnapshot, restoreFromSnapshot, Snapshot } from './serialise';
import { saveLocalBackupFile } from './fileBackup';
import type { S3Config } from './credentialStore';

function makeClient(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function exportToS3(config: S3Config): Promise<void> {
  const snapshot = await dumpToSnapshot();
  const body = JSON.stringify(snapshot, null, 2);

  // Step 1: Save local snapshot to File on iOS/device first
  await saveLocalBackupFile(body, `payroll-export-${Date.now()}.json`);
  await saveLocalBackupFile(body, 'payroll-backup-latest.json');

  // Step 2: Upload to S3
  const client = makeClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: config.key,
      Body: Buffer.from(body, 'utf-8'),
      ContentType: 'application/json',
    }),
  );
}

export async function importFromS3(config: S3Config): Promise<void> {
  // Step 1: Download from S3
  const client = makeClient(config);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: config.key,
    }),
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const merged = chunks.reduce((acc, c) => {
    const m = new Uint8Array(acc.length + c.length);
    m.set(acc);
    m.set(c, acc.length);
    return m;
  }, new Uint8Array());
  const text = Buffer.from(merged).toString('utf-8');

  // Step 2: Save downloaded data to File before restoring/loading to app database
  await saveLocalBackupFile(text, `payroll-import-${Date.now()}.json`);
  await saveLocalBackupFile(text, 'payroll-backup-latest.json');

  // Step 3: Parse and restore into SQLite tables
  const snapshot: Snapshot = JSON.parse(text);
  await restoreFromSnapshot(snapshot);
}
