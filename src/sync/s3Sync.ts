import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { dumpToSnapshot, restoreFromSnapshot, Snapshot } from './serialise';
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
  const body = JSON.stringify(snapshot);

  const client = makeClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: config.key,
      Body: body,
      ContentType: 'application/json',
    }),
  );
}

export async function importFromS3(config: S3Config): Promise<void> {
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

  const snapshot: Snapshot = JSON.parse(text);
  await restoreFromSnapshot(snapshot);
}
