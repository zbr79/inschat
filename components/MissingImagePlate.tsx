export default function MissingImagePlate({ label }: { label: string }) {
  return (
    <div className="missing-image-plate" role="img" aria-label={label}>
      {label}
    </div>
  );
}
