import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_id } = body;

    if (!file_id) {
      return Response.json({ error: 'Missing file_id' }, { status: 400 });
    }

    // Get signed URL for the file
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: file_id,
      expires_in: 3600 // 1 hour
    });

    return Response.json({ url: signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});