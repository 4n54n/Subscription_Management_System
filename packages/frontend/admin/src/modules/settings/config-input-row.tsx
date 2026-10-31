import { Input } from '@affine/admin/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@affine/admin/components/ui/select';
import { Switch } from '@affine/admin/components/ui/switch';
import { useCallback, useEffect, useState } from 'react';

import { Textarea } from '../../components/ui/textarea';
import { isEqual } from './utils';

export type ConfigInputProps = {
  field: string;
  desc: string;
  defaultValue: any;
  onChange: (key: string, value: any) => void;
} & (
  | {
      type: 'String' | 'Number' | 'Boolean' | 'JSON';
    }
  | {
      type: 'Enum';
      options: string[];
    }
);

const Inputs: Record<
  ConfigInputProps['type'],
  React.ComponentType<{
    field?: string;
    desc?: string;
    defaultValue: any;
    onChange: (value?: any) => void;
    options?: string[];
  }>
> = {
  Boolean: function SwitchInput({ defaultValue, onChange }) {
    const handleSwitchChange = (checked: boolean) => {
      onChange(checked);
    };

    return (
      <Switch
        defaultChecked={defaultValue}
        onCheckedChange={handleSwitchChange}
      />
    );
  },
  String: function StringInput({ field, desc, defaultValue, onChange }: { field?: string; desc?: string; defaultValue: any; onChange: (value?: any) => void }) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            onChange(base64);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const isUrlField =
      (typeof field === 'string' && field.toLowerCase().includes('url')) ||
      (typeof desc === 'string' && desc.toLowerCase().includes('url'));
    const isLogoField =
      (typeof field === 'string' && (field.toLowerCase().includes('logo') || field.toLowerCase().includes('image'))) ||
      (typeof desc === 'string' && (desc.toLowerCase().includes('logo') || desc.toLowerCase().includes('image')));
    const isUploadOnlyLogo =
      typeof field === 'string' &&
      (field === 'oneLogoData' || (isLogoField && !isUrlField && field.toLowerCase().endsWith('data')));

    const allowFileUpload = isLogoField && !isUrlField;

    const isOgImage =
      (typeof field === 'string' && (field.toLowerCase().includes('og') || field.toLowerCase().includes('linkpreview') || field.toLowerCase().includes('preview'))) ||
      (typeof desc === 'string' && (desc.toLowerCase().includes('og') || desc.toLowerCase().includes('link preview') || desc.toLowerCase().includes('preview')));

    const isCompanyLogo =
      (typeof field === 'string' && (field.toLowerCase().includes('company') || field.toLowerCase().includes('secondary'))) ||
      (typeof desc === 'string' && (desc.toLowerCase().includes('company') || desc.toLowerCase().includes('secondary')));

    const uploadButtonText = isOgImage
      ? 'Upload Preview Image'
      : isCompanyLogo
      ? 'Upload Company Logo'
      : 'Upload Product Logo';

    const noUploadText = isOgImage
      ? 'No preview image uploaded yet'
      : isCompanyLogo
      ? 'No company logo uploaded yet'
      : 'No logo uploaded yet';

    const removeText = isOgImage
      ? 'Remove Preview Image'
      : isCompanyLogo
      ? 'Remove Company Logo'
      : 'Remove Logo';

    if (isUploadOnlyLogo) {
      return (
        <div className="w-full flex flex-col gap-3 p-3 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="file"
              accept="image/*"
              id={`file-upload-${field}`}
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor={`file-upload-${field}`}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1 cursor-pointer"
            >
              {uploadButtonText}
            </label>
            {defaultValue ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-destructive hover:underline font-medium"
              >
                {removeText}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground italic">{noUploadText}</span>
            )}
          </div>
          {defaultValue && (
            <div className="mt-1 p-2 bg-background border rounded-md inline-block max-w-[240px]">
              <img
                src={defaultValue}
                alt={`${uploadButtonText} Preview`}
                className="max-h-16 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col gap-2">
        <Input
          type="text"
          minLength={1}
          value={defaultValue ?? ''}
          onChange={handleInputChange}
          placeholder={
            isUrlField
              ? "e.g. https://example.com/logo.png"
              : isLogoField
              ? "Paste base64 data or upload file below..."
              : "Enter text value..."
          }
        />
        {isLogoField && (
          <div className="flex items-center gap-3 mt-1">
            {allowFileUpload && (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            )}
            {defaultValue && (
              <img
                src={defaultValue}
                alt="Logo Preview"
                className="h-8 max-w-[120px] object-contain border rounded p-1 bg-white"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  },
  Number: function NumberInput({ defaultValue, onChange }) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value) || 0);
    };

    return (
      <Input
        type="number"
        value={defaultValue ?? ''}
        onChange={handleInputChange}
      />
    );
  },
  JSON: function ObjectInput({ field, defaultValue, onChange }: { field?: string; defaultValue: any; onChange: (value?: any) => void }) {
    const defaultText = typeof defaultValue === 'string'
      ? defaultValue
      : JSON.stringify(defaultValue ?? {}, null, 2);
    const [rawText, setRawText] = useState(defaultText);

    useEffect(() => {
      setRawText(
        typeof defaultValue === 'string'
          ? defaultValue
          : JSON.stringify(defaultValue ?? {}, null, 2)
      );
    }, [defaultValue]);

    const isOAuthField = typeof field === 'string' && field.includes('oauth/providers.');

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setRawText(val);
      try {
        const value = JSON.parse(val);
        onChange(value);
      } catch {}
    };

    const handleInsertTemplate = () => {
      const isOidc = field?.includes('oidc');
      const tmpl = isOidc
        ? { clientId: "YOUR_CLIENT_ID", clientSecret: "YOUR_CLIENT_SECRET", issuer: "https://your-oidc-domain.com" }
        : { clientId: "YOUR_CLIENT_ID", clientSecret: "YOUR_CLIENT_SECRET", args: { tenantId: "common" } };
      const formatted = JSON.stringify(tmpl, null, 2);
      setRawText(formatted);
      onChange(tmpl);
    };

    return (
      <div className="w-full flex flex-col gap-2">
        <Textarea
          value={rawText}
          onChange={handleInputChange}
          placeholder={'{\n  "clientId": "...",\n  "clientSecret": "..."\n}'}
          className="w-full font-mono text-xs min-h-[100px]"
        />
        {isOAuthField && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Required fields: <code className="text-primary font-mono font-semibold">clientId</code>, <code className="text-primary font-mono font-semibold">clientSecret</code></span>
            <button
              type="button"
              onClick={handleInsertTemplate}
              className="text-xs text-blue-500 hover:underline font-mono"
            >
              + Insert OAuth JSON Template
            </button>
          </div>
        )}
      </div>
    );
  },
  Enum: function EnumInput({ defaultValue, onChange, options }) {
    return (
      <Select value={defaultValue} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options?.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
};

export const ConfigRow = ({
  field,
  desc,
  type,
  defaultValue,
  onChange,
  ...props
}: ConfigInputProps) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const isValueChanged = !isEqual(value, defaultValue);

  const onValueChange = useCallback(
    (value?: any) => {
      onChange(field, value);
      setValue(value);
    },
    [field, onChange]
  );

  const Input = Inputs[type] ?? Inputs.JSON;

  return (
    <div
      className={`flex justify-between flex-grow space-y-[10px]
         ${type === 'Boolean' ? 'flex-row' : 'flex-col'}`}
    >
      <div className="text-base font-bold flex-3">{desc}</div>
      <div className="flex flex-col items-end relative flex-1">
        <Input
          field={field}
          desc={desc}
          defaultValue={defaultValue}
          onChange={onValueChange}
          {...props}
        />
        {isValueChanged && (
          <div className="absolute bottom-[-25px] text-sm right-0 break-words">
            <span
              className="line-through"
              style={{
                color: 'rgba(198, 34, 34, 1)',
                backgroundColor: 'rgba(254, 213, 213, 1)',
              }}
            >
              {JSON.stringify(defaultValue)}
            </span>{' '}
            =&gt;{' '}
            <span
              style={{
                color: 'rgba(20, 147, 67, 1)',
                backgroundColor: 'rgba(225, 250, 177, 1)',
              }}
            >
              {JSON.stringify(value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
