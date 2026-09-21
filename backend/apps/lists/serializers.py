from rest_framework import serializers


class ListCreateSerializer(serializers.Serializer):
    group_id = serializers.UUIDField()
    name = serializers.CharField(max_length=120)
    visibility = serializers.ChoiceField(choices=["private", "group", "custom"], default="group")
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )


class ListUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    visibility = serializers.ChoiceField(choices=["private", "group", "custom"], required=False)
    participant_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class ListDuplicateSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["all", "uncompleted"], required=False)
    archive_source_if_completed = serializers.BooleanField(required=False, default=False)


class ItemCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=300)


class ItemUpdateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=300, required=False)
    status = serializers.ChoiceField(choices=["active", "done", "failed"], required=False)


class ReorderSerializer(serializers.Serializer):
    ordered_item_ids = serializers.ListField(child=serializers.UUIDField())