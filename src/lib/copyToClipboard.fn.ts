const copyToClipboard = async (text: string, msg?: string) => {
  if (typeof window === undefined) {
    console.log('Warning: Copying to clipboard on non browser environment.');
    return;
  }
  await window.navigator.clipboard.writeText(text);
  alert(msg ?? 'Value copied to clipboard');
};

export default copyToClipboard;
