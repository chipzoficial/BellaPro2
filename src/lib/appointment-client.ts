export function getAppointmentClientName(appointment: {
  client: { name: string } | null;
  clientNameSnapshot: string;
}) {
  return appointment.client?.name ?? appointment.clientNameSnapshot;
}

export function getAppointmentClientPhone(appointment: {
  client: { phone: string | null } | null;
  clientPhoneSnapshot: string | null;
}) {
  return appointment.client?.phone ?? appointment.clientPhoneSnapshot;
}
