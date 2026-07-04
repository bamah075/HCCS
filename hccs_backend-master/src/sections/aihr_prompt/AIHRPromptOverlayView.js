'use client';

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import {
    Alert, Box, Button, Card, CardContent, CardHeader, CircularProgress,
    Stack, TextField, Typography,
} from '@mui/material';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

const MAX_BYTES_DEFAULT = 8192;

function byteLength(s) {
    return new TextEncoder().encode(s || '').length;
}

export default function AIHRPromptOverlayView() {
    const settings = useSettingsContext();
    const [overlay, setOverlay] = useState('');
    const [originalOverlay, setOriginalOverlay] = useState('');
    const [maxBytes, setMaxBytes] = useState(MAX_BYTES_DEFAULT);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/aihr/prompt-overlay', { cache: 'no-store' });
                const data = await res.json();
                if (cancelled) return;
                if (data.status) {
                    setOverlay(data.overlay || '');
                    setOriginalOverlay(data.overlay || '');
                    setMaxBytes(data.maxBytes || MAX_BYTES_DEFAULT);
                    setUpdatedAt(data.updatedAt || null);
                } else {
                    setMessage({ kind: 'error', text: data.message || 'Failed to load custom instructions.' });
                }
            } catch (e) {
                if (!cancelled) setMessage({ kind: 'error', text: e.message });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const bytes = byteLength(overlay);
    const dirty = overlay !== originalOverlay;
    const overLimit = bytes > maxBytes;

    const handleSave = async () => {
        setMessage(null);
        setSaving(true);
        try {
            const res = await fetch('/api/aihr/prompt-overlay', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overlay }),
            });
            const data = await res.json();
            if (data.status) {
                setOriginalOverlay(overlay);
                setMessage({ kind: 'success', text: 'Saved. Active on the next AIHR reply (within ~60 seconds).' });
            } else {
                setMessage({ kind: 'error', text: data.message || 'Save failed.' });
            }
        } catch (e) {
            setMessage({ kind: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleRevert = () => {
        setOverlay(originalOverlay);
        setMessage(null);
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <Card>
                <CardHeader
                    title="AIHR Custom Instructions"
                    subheader="Tell the AIHR chatbot how to behave for your customers. These instructions are applied on every reply."
                    avatar={<Iconify icon="mdi:robot-outline" sx={{ fontSize: 28, color: 'primary.main' }} />}
                />
                <CardContent>
                    {loading ? (
                        <Stack alignItems="center" sx={{ py: 6 }}>
                            <CircularProgress size={32} />
                        </Stack>
                    ) : (
                        <Stack spacing={2.5}>
                            <Alert severity="info" icon={<Iconify icon="mdi:lightbulb-outline" />}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    What goes here
                                </Typography>
                                <Typography variant="body2">
                                    Use this box to shape the chatbot&apos;s tone, what topics to emphasise,
                                    what phrases to use, and what to direct customers to.
                                </Typography>
                                <Box component="ul" sx={{ pl: 2.5, mt: 1, mb: 0 }}>
                                    <li><Typography variant="body2">&quot;Always greet returning users by name when available.&quot;</Typography></li>
                                    <li><Typography variant="body2">&quot;When users ask about salary benchmarks, recommend booking a consultation via enquiry@hccs.sg.&quot;</Typography></li>
                                    <li><Typography variant="body2">&quot;Mention our Q3 retainer promotion for HR Compliance Reviews.&quot;</Typography></li>
                                    <li><Typography variant="body2">&quot;Use a slightly more formal tone when the user writes in Chinese.&quot;</Typography></li>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Note: HCCS&apos;s baseline safety rules — no medical/legal advice, accurate SG-compliance references,
                                    appropriate disclaimers — apply automatically and cannot be overridden from this box.
                                </Typography>
                            </Alert>

                            <TextField
                                label="Custom instructions"
                                multiline
                                minRows={14}
                                maxRows={28}
                                fullWidth
                                value={overlay}
                                onChange={(e) => setOverlay(e.target.value)}
                                placeholder="(empty — AIHR uses default behaviour)"
                                error={overLimit}
                                helperText={
                                    overLimit
                                        ? `${bytes.toLocaleString()} / ${maxBytes.toLocaleString()} bytes — too long, please trim`
                                        : `${bytes.toLocaleString()} / ${maxBytes.toLocaleString()} bytes`
                                }
                            />

                            {message && (
                                <Alert severity={message.kind === 'success' ? 'success' : 'error'}>
                                    {message.text}
                                </Alert>
                            )}

                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Button
                                    variant="contained"
                                    onClick={handleSave}
                                    disabled={!dirty || overLimit || saving}
                                    startIcon={saving ? <CircularProgress size={16} /> : <Iconify icon="mdi:content-save-outline" />}
                                >
                                    {saving ? 'Saving…' : 'Save instructions'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleRevert}
                                    disabled={!dirty || saving}
                                    startIcon={<Iconify icon="mdi:undo" />}
                                >
                                    Revert
                                </Button>
                                {updatedAt && !dirty && (
                                    <Typography variant="caption" color="text.secondary">
                                        Last saved {new Date(updatedAt).toLocaleString()}
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
