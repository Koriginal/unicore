// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .unicore/ folder
export const UNICORE_FOLDER_PERMISSION_PATTERN = '/.unicore/**'

// Permission pattern for granting session-level access to the global ~/.unicore/ folder
export const GLOBAL_UNICORE_FOLDER_PERMISSION_PATTERN = '~/.unicore/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
