'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useSettingsContext } from 'src/components/settings';
import { Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from 'src/auth/context/supabase/lib';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function AdminListView() {
    const settings = useSettingsContext();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [open, setOpen] = useState(false);

    const getData = async () => {
        // var users = await supabase.from("user").select("*");
    };

    const handleOpenCreate = (row = null) => {
        setOpen(true);
        setSelectedUser(row);
    }

    const handleCloseCreate = () => {
        setOpen(false);
        setSelectedUser(null);
    }

    useEffect(() => {
        getData();
    }, []);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Card>
                <CardHeader title="Admin"
                    action={
                        <Button variant='contained' onClick={handleOpenCreate}>
                            Create
                        </Button>
                    }
                ></CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>

                            <TableRow>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell>
                                    <IconButton>
                                        <Iconify icon="tabler:edit" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog
                open={open}
                onClose={handleCloseCreate}
            >
                <DialogTitle>Create Admin</DialogTitle>
                <DialogContent style={{
                    minWidth: "500px",
                    paddingTop: "10px"
                }}>
                    <Stack direction={"column"} gap={1}>
                        <TextField name="name" label="Name" ></TextField>
                        <TextField name="email" label="Email"></TextField>
                        <TextField name="password" label="Password" type="password"></TextField>
                        <TextField name="password2" label="Confirm Password" type="password"></TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant='contained'

                    >Submit</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
