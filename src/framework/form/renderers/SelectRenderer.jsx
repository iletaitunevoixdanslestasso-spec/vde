export default function SelectRenderer({
    field,
    form,
    context,
    onChange
}) {

    const options = field.options || context[field.source] || [];

    return (
        <select
            value={form[field.field] || ""}
            onChange={(e) =>
                onChange(field.field, e.target.value)
            }
        >

            <option value="">
                -- Choisir --
            </option>

            {options.map(option => (

                <option
                    key={option.id}
                    value={option.id}
                >
                    {/* { `${option.nom} ?? ${option.value}`} */}
                    { option.value ?? option.nom ?? option.titre }
                </option>

            ))}

        </select>
    );
}