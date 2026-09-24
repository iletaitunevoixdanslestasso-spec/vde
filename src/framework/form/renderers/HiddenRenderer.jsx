export default function HiddenRenderer({
    field,
    form,
    onChange
}) {
    console.error(field)
    return (
        <input
            type="hidden"
            value={form[field.field] || ""}

        />
    );
}