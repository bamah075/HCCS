'use client';

import Container from '@mui/material/Container';
import {
  Card, CardContent, CardHeader, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useSettingsContext } from 'src/components/settings';
import { get_consultations } from 'src/components/api/api';

export default function ConsultationListView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    get_consultations().then((res) => {
      if (res.status) setRows(res.data);
    });
  }, []);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader title="Consultation Requests" />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Service of Interest</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.full_name ?? '-'}</TableCell>
                  <TableCell>{r.email ?? '-'}</TableCell>
                  <TableCell>{r.contact ?? '-'}</TableCell>
                  <TableCell>{r.company_name ?? '-'}</TableCell>
                  <TableCell>{r.industry ?? '-'}</TableCell>
                  <TableCell>{r.size ?? '-'}</TableCell>
                  <TableCell>
                    {r.service_of_interest ? (
                      <Chip label={r.service_of_interest} size="small" />
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
