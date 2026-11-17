import pytest

from train_csrnet import split_train_validation_filenames


def test_training_split_is_deterministic_and_in_range():
    filenames = [f"IMG_{index}.jpg" for index in range(20)]
    train, validation = split_train_validation_filenames(filenames, 0.15, seed=42)
    train_again, validation_again = split_train_validation_filenames(filenames, 0.15, seed=42)
    assert validation == validation_again
    assert train == train_again
    assert len(validation) == 3
    assert set(train).isdisjoint(validation)


def test_training_split_rejects_fraction_outside_policy():
    with pytest.raises(ValueError, match="between 0.10 and 0.20"):
        split_train_validation_filenames(["a.jpg", "b.jpg"], 0.25, seed=42)
