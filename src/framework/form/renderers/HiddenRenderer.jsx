export default function HiddenRenderer({
    field,
    form,
    onChange
}) {
    console.log(field)
    return (
        <input
            type="hidden"
            value={form[field.field] || ""}

        />
    );
}