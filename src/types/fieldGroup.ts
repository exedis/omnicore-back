// Типы для ассоциированных полей
export interface AssociatedField {
  id: string;
  fieldName: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  field: AssociatedField;
}

export interface FieldGroupResponse {
  id: string;
  title: string;
  field: AssociatedField;
}
