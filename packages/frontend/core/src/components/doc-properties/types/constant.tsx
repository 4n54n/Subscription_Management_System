import type { I18nString } from '@affine/i18n';
import {
  CheckBoxCheckLinearIcon,
  DateTimeIcon,
  EdgelessIcon,
  FileIcon,
  HistoryIcon,
  LongerIcon,
  MemberIcon,
  NumberIcon,
  TagIcon,
  TemplateIcon,
  TextIcon,
  TodayIcon,
} from '@blocksuite/icons/rc';

import { CheckboxValue } from './checkbox';
import { CreatedByValue, UpdatedByValue } from './created-updated-by';
import { CreateDateValue, DateValue, UpdatedDateValue } from './date';
import { DocPrimaryModeValue } from './doc-primary-mode';
import { EdgelessThemeValue } from './edgeless-theme';
import { JournalValue } from './journal';
import { NumberValue } from './number';
import { PageWidthValue } from './page-width';
import { TagsValue } from './tags';
import { TemplateValue } from './template';
import { TextValue } from './text';
import type { PropertyValueProps } from './types';

export const DocPropertyTypes = {
  tags: {
    icon: TagIcon,
    value: TagsValue,
    name: 'com.IntoAI.page-properties.property.tags',
    uniqueId: 'tags',
    renameable: false,
    description: 'com.IntoAI.page-properties.property.tags.tooltips',
  },
  text: {
    icon: TextIcon,
    value: TextValue,
    name: 'com.IntoAI.page-properties.property.text',
    description: 'com.IntoAI.page-properties.property.text.tooltips',
  },
  number: {
    icon: NumberIcon,
    value: NumberValue,
    name: 'com.IntoAI.page-properties.property.number',
    description: 'com.IntoAI.page-properties.property.number.tooltips',
  },
  checkbox: {
    icon: CheckBoxCheckLinearIcon,
    value: CheckboxValue,
    name: 'com.IntoAI.page-properties.property.checkbox',
    description: 'com.IntoAI.page-properties.property.checkbox.tooltips',
  },
  date: {
    icon: DateTimeIcon,
    value: DateValue,
    name: 'com.IntoAI.page-properties.property.date',
    description: 'com.IntoAI.page-properties.property.date.tooltips',
  },
  createdBy: {
    icon: MemberIcon,
    value: CreatedByValue,
    name: 'com.IntoAI.page-properties.property.createdBy',
    description: 'com.IntoAI.page-properties.property.createdBy.tooltips',
  },
  updatedBy: {
    icon: MemberIcon,
    value: UpdatedByValue,
    name: 'com.IntoAI.page-properties.property.updatedBy',
    description: 'com.IntoAI.page-properties.property.updatedBy.tooltips',
  },
  updatedAt: {
    icon: DateTimeIcon,
    value: UpdatedDateValue,
    name: 'com.IntoAI.page-properties.property.updatedAt',
    description: 'com.IntoAI.page-properties.property.updatedAt.tooltips',
    renameable: false,
  },
  createdAt: {
    icon: HistoryIcon,
    value: CreateDateValue,
    name: 'com.IntoAI.page-properties.property.createdAt',
    description: 'com.IntoAI.page-properties.property.createdAt.tooltips',
    renameable: false,
  },
  docPrimaryMode: {
    icon: FileIcon,
    value: DocPrimaryModeValue,
    name: 'com.IntoAI.page-properties.property.docPrimaryMode',
    description: 'com.IntoAI.page-properties.property.docPrimaryMode.tooltips',
  },
  journal: {
    icon: TodayIcon,
    value: JournalValue,
    name: 'com.IntoAI.page-properties.property.journal',
    description: 'com.IntoAI.page-properties.property.journal.tooltips',
  },
  edgelessTheme: {
    icon: EdgelessIcon,
    value: EdgelessThemeValue,
    name: 'com.IntoAI.page-properties.property.edgelessTheme',
    description: 'com.IntoAI.page-properties.property.edgelessTheme.tooltips',
  },
  pageWidth: {
    icon: LongerIcon,
    value: PageWidthValue,
    name: 'com.IntoAI.page-properties.property.pageWidth',
    description: 'com.IntoAI.page-properties.property.pageWidth.tooltips',
  },
  template: {
    icon: TemplateIcon,
    value: TemplateValue,
    name: 'com.IntoAI.page-properties.property.template',
    renameable: true,
    description: 'com.IntoAI.page-properties.property.template.tooltips',
  },
} as Record<
  string,
  {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    value?: React.FC<PropertyValueProps>;
    /**
     * set a unique id for property type, make the property type can only be created once.
     */
    uniqueId?: string;
    name: I18nString;
    renameable?: boolean;
    description?: I18nString;
  }
>;

export const isSupportedDocPropertyType = (type?: string): boolean => {
  return type ? type in DocPropertyTypes : false;
};
