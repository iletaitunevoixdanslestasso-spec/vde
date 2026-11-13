
export default function PdfDaiLink({
    href,
    children,
    ...props
}) {
    if (!href) {
        return <span>{children}</span>;
    }

    return (
        <a
            {...props}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    );
}
