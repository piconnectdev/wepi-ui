export default function getIdFromProps(props: any): string | undefined {
  const id = props.match.params.post_id;
  return id ? id : undefined;
}
