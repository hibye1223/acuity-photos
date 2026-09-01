// Next.js remounts this on every navigation (unlike layout.tsx), which is
// what lets a plain CSS entrance animation run again on each page change.
export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out">
      {children}
    </div>
  );
}
