import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ListsStackParamList } from '../../core/navigation/types';
import { useTheme, radius, spacing, typography } from '../../shared/design-system';
import { Screen } from '../../shared/ui/Screen';
import { Badge } from '../../shared/ui/Badge';
import { LoadingState } from '../../shared/ui/LoadingState';
import { ErrorState } from '../../shared/ui/ErrorState';
import {
  useListDetail,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
  useArchiveList,
  useRestoreList,
  useDuplicateList,
  useRenameList,
} from './queries';
import { ListItem } from '../../shared/lib/types';

type Props = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;

function ItemRow({
  item,
  onTap,
  onLongPress,
}: {
  item: ListItem;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const done = item.status === 'done';
  const failed = item.status === 'failed';
  const iconColor = done ? c.success : failed ? c.danger : c.textSecondary;
  const mark = done ? '✓' : failed ? '✕' : '';

  return (
    <Pressable
      onPress={onTap}
      onLongPress={onLongPress}
      style={[styles.itemRow, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View
        style={[
          styles.check,
          {
            borderColor: iconColor,
            backgroundColor: done ? c.successSoft : failed ? c.dangerSoft : 'transparent',
          },
        ]}
      >
        <Text style={[styles.checkText, { color: iconColor }]}>{mark}</Text>
      </View>
      <Text
        style={[
          styles.itemText,
          { color: done || failed ? c.textSecondary : c.textPrimary },
          (done || failed) && styles.itemTextClosed,
        ]}
      >
        {item.text}
      </Text>
    </Pressable>
  );
}

export function ListDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { listId } = route.params;

  const { data: list, isLoading, isError, refetch } = useListDetail(listId);
  const addItem = useAddItem(listId);
  const updateItem = useUpdateItem(listId);
  const deleteItem = useDeleteItem(listId);
  const archive = useArchiveList();
  const restore = useRestoreList();
  const duplicate = useDuplicateList();
  const rename = useRenameList();

  const [text, setText] = useState('');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return <LoadingState />;
  if (isError || !list) return <ErrorState onRetry={() => refetch()} />;

  const activeItems = list.items.filter((i) => i.status === 'active');
  const closedItems = list.items.filter((i) => i.status !== 'active');
  const items = [...activeItems, ...closedItems];

  const onTapItem = (item: ListItem) => {
    const next = item.status === 'active' ? 'done' : 'active';
    updateItem.mutate({ itemId: item.id, data: { status: next } });
  };

  const onAdd = () => {
    const value = text.trim();
    if (!value) return;
    addItem.mutate(value);
    setText('');
  };

  const confirmFinish = () => {
    const activeCount = list.progress.active;
    if (activeCount > 0) {
      Alert.alert(
        t('lists.finishConfirmTitle'),
        t('lists.finishConfirmBody', { count: activeCount }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('lists.finish'), style: 'destructive', onPress: () => archive.mutate(listId) },
        ],
      );
    } else {
      archive.mutate(listId);
    }
  };

  const confirmRename = () => {
    Alert.prompt(t('lists.rename'), undefined, (name) => {
      if (name?.trim()) rename.mutate({ id: listId, name: name.trim() });
    });
  };

  const itemActions = selectedItem
    ? [
        {
          label: selectedItem.status === 'active' ? t('lists.finish') : t('lists.restore'),
          onPress: () => {
            onTapItem(selectedItem);
            setSelectedItem(null);
          },
        },
        {
          label: 'Удалить',
          onPress: () => {
            deleteItem.mutate(selectedItem.id);
            setSelectedItem(null);
          },
        },
      ]
    : [];

return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: c.surface }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={12}>
            <Text style={[styles.headerBtnText, { color: c.primary }]}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.textPrimary }]} numberOfLines={1}>
              {list.name}
            </Text>
            <View style={styles.headerMeta}>
              <Badge label={list.group.name} tone="primary" />
              <Text style={[styles.headerSub, { color: c.textSecondary }]}>
                {t('lists.itemCount', { done: list.progress.done, total: list.progress.total })}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setMenuOpen(true)} style={styles.headerBtn} hitSlop={12}>
            <Text style={[styles.headerBtnText, { color: c.primary }]}>⋮</Text>
          </Pressable>
        </View>

        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textSecondary }]}>
              {t('lists.addItemPlaceholder')}
            </Text>
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onTap={() => onTapItem(item)}
              onLongPress={() => setSelectedItem(item)}
            />
          )}
        />

        <View style={[styles.addBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('lists.addItemPlaceholder')}
            placeholderTextColor={c.textSecondary}
            style={[styles.addInput, { backgroundColor: c.surfaceSecondary, color: c.textPrimary }]}
            onSubmitEditing={onAdd}
            returnKeyType="done"
          />
          <Pressable onPress={onAdd} style={[styles.addBtn, { backgroundColor: c.primary }]}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: c.surface }]}>
            {list.permissions.rename && (
              <Pressable style={styles.menuItem} onPress={confirmRename}>
                <Text style={[styles.menuText, { color: c.textPrimary }]}>{t('lists.rename')}</Text>
              </Pressable>
            )}
            {list.status === 'active' ? (
              <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); confirmFinish(); }}>
                <Text style={[styles.menuText, { color: c.textPrimary }]}>{t('lists.finish')}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); restore.mutate(listId); }}>
                <Text style={[styles.menuText, { color: c.textPrimary }]}>{t('lists.restore')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); duplicate.mutate({ id: listId, mode: 'all' }); }}>
              <Text style={[styles.menuText, { color: c.textPrimary }]}>{t('lists.duplicate')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedItem(null)}>
          <View style={[styles.menu, { backgroundColor: c.surface }]}>
            {selectedItem && (
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>{selectedItem.text}</Text>
            )}
            {itemActions.map((a) => (
              <Pressable key={a.label} style={styles.menuItem} onPress={a.onPress}>
                <Text style={[styles.menuText, { color: c.textPrimary }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerBtn: { padding: spacing.sm },
  headerBtnText: { fontSize: 24, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.titleMedium },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  headerSub: { ...typography.caption },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkText: { fontSize: 16, fontWeight: '700' },
  itemText: { ...typography.bodyLarge, flex: 1 },
  itemTextClosed: { textDecorationLine: 'line-through' },
  empty: { ...typography.bodyMedium, textAlign: 'center', marginTop: spacing.xxl },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    ...typography.bodyLarge,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 26, lineHeight: 30 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  menu: {
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetTitle: { ...typography.titleMedium, marginBottom: spacing.md },
  menuItem: { paddingVertical: spacing.lg },
  menuText: { ...typography.bodyLarge },
});