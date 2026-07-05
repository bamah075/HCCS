'use client';

import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import Iconify from 'src/components/iconify';
import { save_compliance_scan_document } from 'src/components/api/api';

export default function ComplianceDocumentsPanel({ scanId, documents, onUploaded }) {
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [alertState, setAlertState] = useState(null);

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
        if (!scanId || !file) return;
        setUploading(true);
        setAlertState(null);
        const res = await save_compliance_scan_document({
            scan_id: scanId,
            document_b_file: file,
            notes,
        });
        setUploading(false);

        if (!res.status) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to upload document.' });
            return;
        }

        setFile(null);
        setNotes('');
        setAlertState({ severity: 'success', message: 'Document uploaded and combined report generated.' });
        await onUploaded?.();
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                    Supplementary Documents
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload a bespoke review (e.g. an employment-contract compliance check) against this
                    submission. The system regenerates this user&apos;s standard report and merges it with
                    your upload into a combined document — the user is not notified and receives nothing
                    different.
                </Typography>

                {alertState && (
                    <Alert severity={alertState.severity} sx={{ mb: 2 }}>
                        {alertState.message}
                    </Alert>
                )}

                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component="label" startIcon={<Iconify icon="mdi:file-upload-outline" />}>
                        {file ? 'Change file' : 'Upload PDF'}
                        <input hidden type="file" accept="application/pdf" onChange={handleFileChange} />
                    </Button>
                    {file && <Chip label={file.name} onDelete={() => setFile(null)} />}
                </Stack>

                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ mb: 2 }}
                />

                <LoadingButton
                    variant="contained"
                    loading={uploading}
                    disabled={!file}
                    onClick={handleUpload}
                >
                    Upload &amp; Generate Combined Document
                </LoadingButton>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Previous Uploads
                    </Typography>
                    {(!documents || documents.length === 0) && (
                        <Typography variant="body2" color="text.secondary">
                            No supplementary documents uploaded yet.
                        </Typography>
                    )}
                    <Stack spacing={1.5}>
                        {(documents || []).map((doc) => (
                            <Box
                                key={doc.id}
                                sx={{
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Box>
                                        <Typography variant="body2">{doc.document_b_filename}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}
                                        </Typography>
                                        {doc.notes && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {doc.notes}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            href={doc.document_a_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_a_url}
                                        >
                                            Document A
                                        </Button>
                                        <Button
                                            size="small"
                                            href={doc.document_b_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_b_url}
                                        >
                                            Document B
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            href={doc.document_c_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_c_url}
                                        >
                                            Document C (combined)
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
