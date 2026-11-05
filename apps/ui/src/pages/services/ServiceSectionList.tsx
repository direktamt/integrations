import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ServiceSection } from '@direktamt/integrations-contracts';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { HtmlSection } from '../../components/HtmlSection';

interface ServiceSectionListProps {
  sections: ServiceSection[];
}

/**
 * All content sections of a service description as accordions:
 * semantic type, original German title, sanitized HTML body, links.
 */
export function ServiceSectionList({ sections }: ServiceSectionListProps) {
  if (sections.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        This description has no sections.
      </Typography>
    );
  }

  return (
    <div>
      {sections.map((section, index) => (
        <Accordion key={index}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
            >
              {section.originalTitle && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {section.originalTitle}
                </Typography>
              )}
              <Chip
                label={section.type}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {section.htmlText ? (
              <HtmlSection html={section.htmlText} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No text content.
              </Typography>
            )}
            {section.links.length > 0 && (
              <List dense sx={{ mt: 1 }}>
                {section.links.map((link, linkIndex) => (
                  <ListItem key={linkIndex} disablePadding>
                    <ListItemText
                      primary={
                        link.url ? (
                          <Link
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {link.title || link.url}
                          </Link>
                        ) : (
                          link.title
                        )
                      }
                      secondary={link.description}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
