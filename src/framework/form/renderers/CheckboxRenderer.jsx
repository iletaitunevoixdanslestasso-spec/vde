export default function CheckboxRenderer({
    field,
    form,
    onChange
}) {
    return (
        <input
            type="checkbox"
            checked={!!form[field.field]}
            onChange={(e) =>
                onChange(field.field, e.target.checked)
            }
        />
    );
}