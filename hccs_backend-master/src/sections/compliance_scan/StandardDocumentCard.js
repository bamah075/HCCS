'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, Stack, Typography } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import Iconify from 'src/components/iconify';
import { get_compliance_standard_document, save_compliance_standard_document } from 'src/components/api/api';

// Lets an admin set/replace the one "standard document" that gets
// automatically combined with EVERY new compliance-scan submission going
// forward (see app/api/compliance/route.ts's generateDocumentC on the
// public site). Replacing it only affects future submissions.
export default function StandardDocumentCard() {
    const [current, setCurrent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [alertState, setAlertState] = useState(null);

    const load = async () => {
        setLoading(true);
        const res = await get_compliance_standard_document();
        if (res.status) setCurrent(res.data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleFileChange = (e) => {
        const picked = e.target.files?.[0] ?? null;
        if (picked && picked.type !== 'application/pdf') {
            setAlertState({
                severity: 'error',
                message: "That file isn't a PDF. Please export/save it as a PDF first, then upload it.",
            });
            e.target.value = '';
            setFile(null);
            return;
        }
        setAlertState(null);
        setFile(picked);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setAlertState(null);
        const res = await save_compliance_standard_document({ document_file: file });
        setUploading(false);

        if (!res.status) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to save standard document.' });
            return;
        }

        setFile(null);
        setAlertState({ severity: 'success', message: 'Standard document updated. It will apply to new submissions from now on.' });
        await load();
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardHeader title="Standard Supplementary Document" />
            <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This document is automatically combined with every new compliance-scan submission's
                    report from now on (Document C). Replacing it only changes what future submissions
                    get — past submissions keep whatever they were already combined with.
                </Typography>

                {alertState && (
                    <Alert severity={alertState.severity} sx={{ mb: 2 }}>
                        {alertState.message}
                    </Alert>
                )}

                <Stack spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Currently active:</Typography>
                    {loading ? (
                        <Typography variant="body2" color="text.secondary">Loading…</Typography>
                    ) : current ? (
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <Chip label={current.original_filename} />
                            <Typography variant="caption" color="text.secondary">
                                since {current.created_at ? new Date(current.created_at).toLocaleString() : '-'}
                            </Typography>
                            {current.url && (
                                <Button size="small" href={current.url} target="_blank" rel="noopener">
                                    View
                                </Button>
                            )}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            None set yet — new submissions won&apos;t generate a Document C until one is uploaded.
                        </Typography>
                    )}
                </Stack>

                <Box>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" component="label" startIcon={<Iconify icon="mdi:file-upload-outline" />}>
                            {file ? 'Change file' : (current ? 'Replace document' : 'Upload document')}
                            <input hidden type="file" accept="application/pdf" onChange={handleFileChange} />
                        </Button>
                        {file && <Chip label={file.name} onDelete={() => setFile(null)} />}
                        <LoadingButton variant="contained" loading={uploading} disabled={!file} onClick={handleUpload}>
                            Save
                        </LoadingButton>
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
