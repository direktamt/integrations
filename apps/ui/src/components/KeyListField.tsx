import { Autocomplete, Chip, TextField } from '@mui/material';

interface KeyListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  helperText?: string;
  minWidth?: number;
}

/**
 * Free-entry multi-value input for official key lists (LeiKa keys,
 * life-situation codes). Values render as monospace chips; typed input
 * is committed on Enter or blur, pasted comma-separated lists are split.
 */
export function KeyListField({
  label,
  value,
  onChange,
  helperText = 'Press Enter to add',
  minWidth = 280,
}: KeyListFieldProps) {
  const commit = (values: readonly string[]) => {
    const normalized = values
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    onChange([...new Set(normalized)]);
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      options={[]}
      value={value}
      onChange={(_, newValue) => commit(newValue)}
      renderTags={(tags, getTagProps) =>
        tags.map((tag, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={tag}
              size="small"
              sx={{ fontFamily: 'monospace' }}
              {...tagProps}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          helperText={helperText}
        />
      )}
      sx={{ minWidth }}
    />
  );
}
