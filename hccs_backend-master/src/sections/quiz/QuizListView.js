'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { clear_mini_quiz_qr_code, get_mini_quiz_completions } from 'src/components/api/api';
import { useSettingsContext } from 'src/components/settings';

const TABLE_CODES = Array.from({ length: 11 }, (_, index) => String.fromCharCode(65 + index));

export default function QuizListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const fetchMiniQuizCompletions = useCallback(async () => {
    const response = await get_mini_quiz_completions();

    if (response.status) {
      setRows(Array.isArray(response.data) ? response.data : []);
      return;
    }

    setError(response.message || 'Failed to load quiz completion records.');
  }, []);

  useEffect(() => {
    fetchMiniQuizCompletions();
  }, [fetchMiniQuizCompletions]);

  const handleClearResults = async () => {
    if (!window.confirm('Clear all Quiz FMAS qr_code values?')) {
      return;
    }

    setIsClearing(true);
    setError('');
    setSuccess('');

    const response = await clear_mini_quiz_qr_code();

    if (!response.status) {
      setError(response.message || 'Failed to clear quiz results.');
      setIsClearing(false);
      return;
    }

    const updatedCount = Number(response.data?.updated_count || 0);
    setSuccess(`Cleared qr_code for ${updatedCount} quiz completion record(s).`);
    await fetchMiniQuizCompletions();
    setIsClearing(false);
  };

  const counts = useMemo(() => {
    const initialCounts = TABLE_CODES.reduce((accumulator, code) => {
      accumulator[code] = 0;
      return accumulator;
    }, {});

    rows.forEach((row) => {
      const code = String(row?.qr_code || '').trim().toUpperCase();

      if (Object.hasOwn(initialCounts, code)) {
        initialCounts[code] += 1;
      }
    });

    return TABLE_CODES.map((code) => ({
      tableNumber: code,
      totalCompletions: initialCounts[code],
    }));
  }, [rows]);

  const totalQrCompletions = useMemo(
    () => counts.reduce((sum, row) => sum + row.totalCompletions, 0),
    [counts]
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Quiz FMAS"
          subheader={`FMAS event QR quiz completions recorded: ${totalQrCompletions}`}
          action={
            <Button variant="contained" color="error" onClick={handleClearResults} disabled={isClearing}>
              {isClearing ? 'Clearing...' : 'Clear Results'}
            </Button>
          }
        />
        <CardContent>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

          {!error ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Each row shows the total number of quiz completion records where qr_code matches
                the table code from A to K.
              </Typography>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Table Number</TableCell>
                    <TableCell align="right">Total Quiz Completions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {counts.map((row) => (
                    <TableRow key={row.tableNumber}>
                      <TableCell>{row.tableNumber}</TableCell>
                      <TableCell align="right">{row.totalCompletions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}