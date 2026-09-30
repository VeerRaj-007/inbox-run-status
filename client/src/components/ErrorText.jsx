export default function ErrorText({ error }) {
  if (error === null || error === undefined || error === "") {
    return null;
  }

  return <p className="error-text">{String(error)}</p>;
}
