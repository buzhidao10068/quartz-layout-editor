import json
import math
import sys

import yaml

POSITIONS = {'header', 'left', 'right', 'beforeBody', 'afterBody', 'footer'}


def validate(document):
    if not isinstance(document, dict) or not isinstance(document.get('plugins'), list):
        raise ValueError('Configuration must contain a plugin list')
    for plugin in document['plugins']:
        if not isinstance(plugin, dict):
            raise ValueError('Plugin must be a mapping')
        if 'enabled' in plugin and type(plugin['enabled']) is not bool:
            raise ValueError('enabled must be boolean')
        layout = plugin.get('layout')
        if layout is None:
            continue
        if not isinstance(layout, dict):
            raise ValueError('layout must be a mapping')
        if not {'position', 'priority'}.issubset(layout):
            raise ValueError('Explicit layout requires position and priority')
        if not set(layout).issubset({'position', 'priority', 'display', 'condition', 'group', 'groupOptions'}):
            raise ValueError('Unknown layout field')
        if 'position' in layout and layout['position'] not in POSITIONS:
            raise ValueError('Invalid position')
        if 'priority' in layout and (type(layout['priority']) not in (int, float) or not math.isfinite(layout['priority'])):
            raise ValueError('Invalid priority')
        if 'display' in layout and layout['display'] not in {'all', 'mobile-only', 'desktop-only'}:
            raise ValueError('Invalid display')
        for field in ('condition', 'group'):
            if field in layout and not isinstance(layout[field], str):
                raise ValueError(f'Invalid {field}')
        options = layout.get('groupOptions', {})
        if not isinstance(options, dict) or not set(options).issubset({'grow', 'shrink', 'basis', 'order', 'align', 'justify'}):
            raise ValueError('Invalid groupOptions')
        for field in ('grow', 'shrink'):
            if field in options and type(options[field]) is not bool:
                raise ValueError(f'Invalid {field}')
        if 'basis' in options and not isinstance(options['basis'], str):
            raise ValueError('Invalid basis')
        if 'order' in options and (type(options['order']) not in (int, float) or not math.isfinite(options['order'])):
            raise ValueError('Invalid order')
        if 'align' in options and options['align'] not in {'start', 'end', 'center', 'stretch'}:
            raise ValueError('Invalid align')
        if 'justify' in options and options['justify'] not in {'start', 'end', 'center', 'between', 'around'}:
            raise ValueError('Invalid justify')
    section = document.get('layout', {})
    for group in section.get('groups', {}).values():
        if not isinstance(group, dict) or not set(group).issubset({'priority', 'direction', 'wrap', 'gap'}):
            raise ValueError('Invalid group configuration')
        if 'priority' in group and (type(group['priority']) not in (int, float) or not math.isfinite(group['priority'])):
            raise ValueError('Invalid group priority')
        if 'direction' in group and group['direction'] not in {'row', 'row-reverse', 'column', 'column-reverse'}:
            raise ValueError('Invalid group direction')
        if 'wrap' in group and group['wrap'] not in {'nowrap', 'wrap', 'wrap-reverse'}:
            raise ValueError('Invalid group wrap')
        if 'gap' in group and not isinstance(group['gap'], str):
            raise ValueError('Invalid group gap')
    for page in section.get('byPageType', {}).values():
        if not isinstance(page, dict):
            raise ValueError('Invalid page override')
        if 'exclude' in page and (not isinstance(page['exclude'], list) or any(not isinstance(name, str) for name in page['exclude'])):
            raise ValueError('Invalid exclude list')
        if 'template' in page and not isinstance(page['template'], str):
            raise ValueError('Invalid page template')
        for position, value in page.get('positions', {}).items():
            if position not in POSITIONS or value != []:
                raise ValueError('Only empty position overrides are supported')


def changes(before, after, path=''):
    if type(before) is not type(after):
        return [path]
    if isinstance(before, dict):
        paths = []
        for key in sorted(set(before) | set(after), key=str):
            child = f'{path}.{key}' if path else str(key)
            if key not in before or key not in after:
                paths.append(child)
            else:
                paths.extend(changes(before[key], after[key], child))
        return paths
    if isinstance(before, list):
        if len(before) != len(after):
            return [path]
        paths = []
        for index, (first, second) in enumerate(zip(before, after)):
            paths.extend(changes(first, second, f'{path}.{index}'))
        return paths
    return [] if before == after else [path]


def main():
    request = json.load(sys.stdin)
    before = yaml.safe_load(request['before'])
    after = yaml.safe_load(request['after'])
    validate(after)
    json.dump({'valid': True, 'paths': changes(before, after)}, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
