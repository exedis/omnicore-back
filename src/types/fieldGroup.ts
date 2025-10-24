// Типы для ассоциированных полей
export interface AssociatedField {
  id: string;
  fieldName: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  fields: AssociatedField[];
}

export interface FieldGroupResponse {
  id: string;
  title: string;
  fields: AssociatedField[];
}
