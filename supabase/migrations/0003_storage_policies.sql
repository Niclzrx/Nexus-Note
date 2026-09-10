-- 0003_storage_policies.sql
-- Storage policies for board-assets bucket.
-- The bucket itself must be created manually in the Supabase Dashboard:
--   Name: board-assets
--   Public: true
--   File size limit: 52428800 (50 MB)
--   Allowed MIME types: image/*, video/*, audio/*, application/pdf, */*

-- Allow authenticated users to upload files to board-assets
CREATE POLICY "Authenticated users can upload board assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'board-assets');

-- Anyone (including anon) can read files from board-assets (public bucket)
CREATE POLICY "Public read access for board assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'board-assets');

-- Owners can delete their own files (folder name = boardId/assetId, first segment = boardId)
CREATE POLICY "Board owners can delete their assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-assets'
  AND EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = (storage.foldername(objects.name))[1]
    AND documents.owner_id = auth.uid()
  )
);
