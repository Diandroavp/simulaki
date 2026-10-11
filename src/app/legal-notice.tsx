export function ReviewNotice({ reviewed }: { reviewed: boolean }) {
  if (reviewed) return null;
  return (
    <p className="note" role="note">
      Versão provisória do período beta, em revisão jurídica. Pode mudar antes do lançamento oficial.
    </p>
  );
}
