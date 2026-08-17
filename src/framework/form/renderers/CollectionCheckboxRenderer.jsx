export default function CollectionCheckboxRenderer({
    field,
    form,
    context,
    onChange
}) {

    const items = context[field.source] || [];

    const selected = form[field.field] || [];

    const toggle = (id) => {

        if (selected.includes(id)) {

            onChange(
                field.field,
                selected.filter(x => x !== id)
            );

        } else {

            onChange(
                field.field,
                [...selected, id]
            );
        }
    };


    const selectAll = () => {

        onChange(
            field.field,
            items.map(item => item[field.valueField])
        );

    };


    const unselectAll = () => {

        onChange(
            field.field,
            []
        );

    };


    return (
        <div>

            <div style={{marginBottom:10}}>
                <button type="button" onClick={selectAll}>
                    Tout cocher
                </button>

                <button 
                    type="button" 
                    onClick={unselectAll}
                    style={{marginLeft:10}}
                >
                    Tout décocher
                </button>
            </div>


            {items.map(item => (

                <div key={item[field.valueField]}>

                    <label>

                        <input
                            type="checkbox"
                            checked={
                                selected.includes(
                                    item[field.valueField]
                                )
                            }
                            onChange={() =>
                                toggle(
                                    item[field.valueField]
                                )
                            }
                        />

                        {item[field.labelField]}

                    </label>

                </div>

            ))}

        </div>
    );
}