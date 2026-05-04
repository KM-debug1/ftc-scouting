export interface DialogData {
  title: string; // Required title field for all dialog
  message?: string; // Optional message field for all dialog
  messageArray?: string[]; // Optional message array field for all dialog
  buttonOne?: string; // Left Button (usually Cancel, No, etc)
  buttonTwo?: string; // Right Button (usually Confirm, Yes, etc)

  itemName?: string; // itemName field for Delete Item dialog
  reportName?: string;
  entityName?: string;
}
