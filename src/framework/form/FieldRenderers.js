import FileUploader from "../../core/framework/FileUploader";
import CheckboxRenderer from "./renderers/CheckboxRenderer";
import CollectionCheckboxRenderer from "./renderers/CollectionCheckboxRenderer";
import DateRenderer from "./renderers/DateRenderer";
import FileRenderer from "./renderers/FileRenderer";
import FileUploaderRenderer from "./renderers/FileUploaderRenderer";
import HiddenRenderer from "./renderers/HiddenRenderer";
import NumberRenderer from "./renderers/NumberRenderer";
import SelectRenderer from "./renderers/SelectRenderer";
import TextareaRenderer from "./renderers/Textarea";
import TextRenderer from "./renderers/TextRenderer";

export const FieldRenderers = {

    text: TextRenderer,
    date: DateRenderer,
    number: NumberRenderer,
    select:SelectRenderer,
    collectionCheckbox:CollectionCheckboxRenderer,
    hidden:HiddenRenderer,
    fileUploader:FileUploaderRenderer,
    textarea:TextareaRenderer,
    checkbox:CheckboxRenderer,
};