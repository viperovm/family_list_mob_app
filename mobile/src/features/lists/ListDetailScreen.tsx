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
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { ApiError } from '../../shared/api/client';
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
          item.priority && !done && !failed && styles.itemTextPriority,
          (done || failed) && styles.itemTextClosed,
        ]}
      >
        {item.priority && !done && !failed ? '★ ' : ''}
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !list) return <ErrorState onRetry={() => refetch()} />;

  const activeItems = list.items.filter((i) => i.status === 'active');
  const failedItems = list.items.filter((i) => i.status === 'failed');
  const doneItems = list.items.filter((i) => i.status === 'done');
  const items = [...activeItems, ...failedItems, ...doneItems];

  const finishAndClose = () => {
    archive.mutate(listId, { onSuccess: () => navigation.goBack() });
  };

  const offerCloseWhenAllDone = () => {
    Alert.alert(t('lists.allDoneTitle'), t('lists.allDoneBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('lists.finish'), onPress: finishAndClose },
    ]);
  };

  const onTapItem = (item: ListItem) => {
    const next = item.status === 'active' ? 'done' : 'active';
    updateItem.mutate(
      { itemId: item.id, data: { status: next } },
      {
        onSuccess: () => {
          if (next === 'done' && list.progress.active === 1) offerCloseWhenAllDone();
        },
      },
    );
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
          { text: t('lists.finish'), style: 'destructive', onPress: finishAndClose },
        ],
      );
    } else {
      finishAndClose();
    }
  };

  const openRename = () => {
    setMenuOpen(false);
    setRenameValue(list.name);
    setRenameError(null);
    setRenameOpen(true);
  };

  const submitRename = async () => {
    const value = renameValue.trim();
    if (!value) return;
    setRenameError(null);
    try {
      await rename.mutateAsync({ id: listId, name: value });
      setRenameOpen(false);
    } catch (e) {
      if (e instanceof ApiError) setRenameError(e.message);
      else setRenameError(t('common.error'));
    }
  };

  const markStatus = (item: ListItem, status: 'active' | 'done' | 'failed') => {
    updateItem.mutate({ itemId: item.id, data: { status } });
    setSelectedItem(null);
  };

  const togglePriority = (item: ListItem) => {
    updateItem.mutate({ itemId: item.id, data: { priority: !item.priority } });
    setSelectedItem(null);
  };

  const removeItem = (item: ListItem) => {
    deleteItem.mutate(item.id);
    setSelectedItem(null);
  };

  const itemActions = selectedItem ? buildItemActions(selectedItem) : [];

  function buildItemActions(item: ListItem) {
    if (item.status === 'active') {
      return [
        { label: t('lists.markPurchased'), onPress: () => markStatus(item, 'done') },
        { label: t('lists.markNotPurchased'), onPress: () => markStatus(item, 'failed') },
        {
          label: item.priority ? t('lists.unpriority') : t('lists.priority'),
          onPress: () => togglePriority(item),
        },
        { label: t('lists.delete'), onPress: () => removeItem(item) },
      ];
    }
    return [
      { label: t('lists.restore'), onPress: () => markStatus(item, 'active') },
      {
        label: item.status === 'done' ? t('lists.markNotPurchased') : t('lists.markPurchased'),
        onPress: () => markStatus(item, item.status === 'done' ? 'failed' : 'done'),
      },
      { label: t('lists.delete'), onPress: () => removeItem(item) },
    ];
  }

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg }}
          keyboardShouldPersistTaps="handled"
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
              <Pressable style={styles.menuItem} onPress={openRename}>
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

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <Pressable style={styles.dialogOverlay} onPress={() => setRenameOpen(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { color: c.textPrimary }]}>{t('lists.rename')}</Text>
            <Input
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('lists.namePlaceholder')}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={submitRename}
              returnKeyType="done"
              error={renameError ?? undefined}
            />
            <View style={styles.dialogActions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setRenameOpen(false)}
                style={styles.dialogBtn}
              />
              <Button
                title={t('common.save')}
                onPress={submitRename}
                loading={rename.isPending}
                disabled={!renameValue.trim()}
                style={styles.dialogBtn}
              />
            </View>
          </Pressable>
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
  itemTextPriority: { fontWeight: '700' },
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
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.xl,
  },
  dialog: {
    borderRadius: radius.dialog,
    padding: spacing.xl,
  },
  dialogTitle: { ...typography.titleMedium, marginBottom: spacing.lg },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dialogBtn: { flex: 1 },
});