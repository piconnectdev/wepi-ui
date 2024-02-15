export default function getRecipientIdFromProps(props: any): string {
  return props.match.params.recipient_id
    ? props.match.params.recipient_id
    : "00000000-0000-0000-0000-000000000000";
}
