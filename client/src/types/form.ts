type InputFieldConfig = {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: any;
    multiple?: boolean;
};

type SelectFieldConfig = {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    options: { value: string | number; label: string }[];
};


export type FormConfig = {
    input?: InputFieldConfig[];
    select?: SelectFieldConfig[];
};