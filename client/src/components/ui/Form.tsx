import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { FormConfig } from "@/types/form";
import { cn } from "@/utils/cn";
import { onRequest } from "@/utils/handleReq";
import { ImageIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { BlockProps } from "./Block";
import { Block } from "./Block";

interface FormProps<T> extends Omit<BlockProps, 'children'> {
    message: string;
    config: FormConfig;
    initialValues?: T;
    requestMethod?: (values: T) => Promise<any>;
    onSubmit?: (...args: any[]) => Promise<any>;
}

export function Form<T extends Record<string, any>>({ config, initialValues, className, requestMethod, message, onSubmit, ...blockProps }: FormProps<T>) {
    function getInitialValuesFromConfig(config: FormConfig) {
        const initial: Record<string, any> = {};
        if (config.input) {
            config.input.forEach((field) => {
                if ('defaultValue' in field && field.defaultValue !== undefined) {
                    initial[field.name] = field.defaultValue;
                } else if (field.type === 'number') {
                    initial[field.name] = undefined;
                } else {
                    initial[field.name] = undefined;
                }
            });
        }
        if (config.select) {
            config.select.forEach((field) => {
                initial[field.name] = undefined;
            });
        }
        return initial;
    }

    const [values, setValues] = useState<T>(initialValues ?? (getInitialValuesFromConfig(config) as T));
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = 'checked' in e.target ? e.target.checked : false;
        setValues((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        let prodData = new FormData(e.target)

        if (onSubmit) {
            await onSubmit(values);
            setLoading(false);

            return;
        }
        if (!requestMethod) {
            return;
        }


        let method = requestMethod;
        if (typeof method === 'function' && method.prototype && Object.prototype.hasOwnProperty.call(method, 'prototype') === false) {
        } else if (typeof method === 'function' && method.name && method.name !== '') {
            try {
                method = method.bind((requestMethod as any)["this"] || null);
            } catch { }
        }
        const data = await onRequest(method(prodData as any));
        if (data) {
            toast.success(message || 'данные успешно обновлены')
        }
        setLoading(false);
    }


    useEffect(() => {
        setValues(prev => {
            const initial = initialValues ?? (getInitialValuesFromConfig(config) as T);
            const merged: Record<string, any> = { ...initial };
            for (const key in prev) {
                if (key in merged) merged[key] = prev[key];
            }
            return merged as T;
        });
    }, [JSON.stringify(initialValues), JSON.stringify(config)]);


    return (
        <Block {...blockProps} className={cn("", className)}>

            <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2 w-full', className)} encType="multipart/form-data">

                {config.select && config.select.map((field) => (
                    <Select
                        key={field.name}
                        name={field.name}
                        placeholder={field.placeholder || ''}
                        options={field.options || []}
                        value={values[field.name] ?? ''}
                        onChange={(val) => setValues((prev) => ({ ...prev, [field.name]: val }))}
                        isRequired={field.required !== false}
                    />
                ))}

                {config.input && config.input.map((field) => (
                    field.type === 'file' ? (
                        <Block key={field.name} icons={[<ImageIcon />]} title={field.label}>
                            <div className="relative w-fit">
                                <input
                                    type="file"
                                    name={field.name}
                                    accept="image/*, video/*"
                                    multiple={field.multiple}
                                    id={`file-input-${field.name}`}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={e => {
                                        const files = e.target.files ? Array.from(e.target.files) : [];
                                        setValues(prev => ({ ...prev, [field.name]: field.multiple ? files : files[0] }));
                                    }}
                                    required={field.required !== false}
                                />


                                <Button text={field.multiple ? 'Выбрать файлы' : 'Выбрать файл'} FC={() => document.getElementById(`file-input-${field.name}`)?.click()}></Button>

                            </div>
                            {Array.isArray(values[field.name]) && values[field.name].length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {values[field.name].map((file: File | string, idx: number) => (
                                        typeof file === 'string' && file.match(/^data:|^blob:|^https?:/) ? (
                                            <img
                                                key={idx}
                                                src={file}
                                                alt="preview"
                                                className="w-24 h-24 object-cover rounded border border-gray-600"
                                            />
                                        ) : file instanceof File && file.type.startsWith('image') ? (
                                            <img
                                                key={idx}
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="w-24 h-24 object-cover rounded border border-gray-600"
                                            />
                                        ) : (
                                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1 border border-gray-300">{file instanceof File ? file.name : String(file)}</span>
                                        )
                                    ))}
                                </div>
                            )}

                            {!Array.isArray(values[field.name]) && values[field.name] && (
                                typeof values[field.name] === 'string' && values[field.name].match(/^data:|^blob:|^https?:/) ? (
                                    <img
                                        src={values[field.name]}
                                        alt="preview"
                                        className="w-24 h-24 object-cover rounded border border-gray-600 mt-2"
                                    />
                                ) : values[field.name] instanceof File && values[field.name].type.startsWith('image') ? (
                                    <img
                                        src={URL.createObjectURL(values[field.name])}
                                        alt="preview"
                                        className="w-24 h-24 object-cover rounded border border-gray-600 mt-2"
                                    />
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1 border border-gray-300 mt-2">{values[field.name] instanceof File ? values[field.name].name : String(values[field.name])}</span>
                                )
                            )}
                        </Block>
                    ) : field.type === 'textarea' ? (
                        <TextArea
                            key={field.name}
                            name={field.name}
                            placeholder={field.placeholder || ''}
                            value={values[field.name]}
                            onChange={handleChange}
                            isRequired={field.required !== false}
                            disabled={false}
                        />
                    ) : (
                        <Input
                            key={field.name}
                            name={field.name}
                            type={field.type || 'text'}
                            placeholder={field.placeholder || ''}
                            value={values[field.name] ?? ''}
                            onChange={handleChange}
                            isRequired={field.required !== false}
                            disabled={false}
                        />
                    )
                ))}

                <Button text="Отправить" formSubmit loading={loading} />
            </form>
        </Block>
    );
} 